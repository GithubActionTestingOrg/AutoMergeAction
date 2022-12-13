const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const token = core.getInput('token');

const octokit = new Octokit({ auth: token });
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo
const headBranch = core.getInput('head'); 
    
let pullRequestArray = [];

const getPullRequests = async () => {
    const resp = octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repo,
        sort: 'long-running',
        direction: 'desc',
        base: headBranch,
    }).catch(
        e => {
            core.setFailed(e.message)
        }
    )
    return resp;
};

async function getRepoRequiredRules() {
    const rules = await octokit.graphql(`query ($owner: String!, $repo: String!) {
        repository(name: $repo, owner: $owner) {
          branchProtectionRules(first: 10) {
              nodes {
                requiredStatusCheckContexts
              }
          }
        }
      }`,
        {
            owner: repoOwner,
            repo: repo,
        });
    
    return rules.repository.branchProtectionRules;
}


export async function getPullRequest(num) {
    const result = await octokit.graphql(
        `query ($owner: String!, $repo: String!, $num: Int!) {
          repository(name: $repo, owner: $owner) {
            pullRequest(number: $num) {
                id
                title
                commits(last: 1) {
                    nodes {
                      commit {
                        statusCheckRollup {
                          contexts(first: 30) {
                            nodes {
                              ... on CheckRun {
                                name
                                conclusion
                              }
                              ... on StatusContext {
                                context
                                state
                              }
                            }
                          }
                          state
                        }
                      }
                    }
                }
                baseRefName
                number
                reviewDecision
            }
          }
        }`,
        {
            owner: repoOwner,
            repo: repo,
            num,
        }
    );

    
    return  result.repository.pullRequest
};

const checkRequiredActions = (repoRequiredRules, commitChecks) => {
    console.log(commitChecks);
}

const updateBranch = async () => {
    if (!pullRequestArray.length) {
        console.log('No pull request for update');
        return;
    }

    const pullRequest = await getPullRequest(pullRequestArray[0].number);
    const repoRequiredRules = await getRepoRequiredRules();


    console.log('repoRequiredRules', JSON.stringify(repoRequiredRules, null, '\t'));

    console.log('pullRequest', JSON.stringify(pullRequest, null, '\t'));

    const commitChecks = pullRequest.commits.nodes[0].commit.statusCheckRollup.contexts.nodes;

    const isChecksComplete = checkRequiredActions(repoRequiredRules, commitChecks);
    
    if (
        pullRequest.status === 'CONFLICTING' ||
        ['CHANGES_REQUESTED', 'REVIEW_REQUIRED'].includes(pullRequest.reviewDecision)
    ) {
        console.log(`Pull request  №${pullRequest.number} can not be merged`);
        pullRequestArray.shift();
        updateBranch();
        return;
    }
    

    // try {
    //     await octokit.rest.pulls.updateBranch({
    //         owner: repoOwner,
    //         repo: repo,
    //         pull_number: pullRequestArray[0].number,
    //     }).then(() => {
    //         console.log(`Pull request  №${ pullRequestArray[0].number} has been updated`);
    //     });
    // } catch (error) {
    //     pullRequestArray.shift();
    //     updateBranch();
    // };
};

async function main() {
    const pullRequestsList = await getPullRequests();
    const filteredPrs = pullRequestsList.data.filter((pr) => pr.auto_merge !== null);
    pullRequestArray = filteredPrs;

    if (!pullRequestArray.length) {
        console.log('auto-merge pull requests is not found');
        return
    }

    if (pullRequestArray.error) console.log(pullRequestArray.error);  

    updateBranch();
};

main();

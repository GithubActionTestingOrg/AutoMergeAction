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

const QUERY = `query($owner: String!, $repo: String!, $pull_number: Int!) {
    repository(owner: $owner, name:$repo) {
      pullRequest(number:$pull_number) {
        commits(last: 1) {
          nodes {
            commit {
              checkSuites(first: 100) {
                nodes {
                  checkRuns(first: 100) {
                    nodes {
                      name
                      conclusion
                      permalink
                    }
                  }
                }
              }
              status {
                state
                contexts {
                  state
                  targetUrl
                  description
                  context
                }
              }
            }
          }
        }
      }
    }
  }`
  
  async function getCombinedSuccess(num) {
    const result = await octokit.graphql(query, {   owner: repoOwner,
        repo: repo, num });
    const [{ commit: lastCommit }] = result.repository.pullRequest.commits.nodes;
  
    const allChecksSuccess = [].concat(
      ...lastCommit.checkSuites.nodes.map(node => node.checkRuns.nodes)
    ).every(checkRun => checkRun.conclusion === "SUCCESS")
    const allStatusesSuccess = lastCommit.status.contexts.every(status => status.state === "SUCCESS");
  
    return allStatusesSuccess || allChecksSuccess
  }

export async function getPullRequest(num) {
    const result = await octokit.graphql(
        `query ($owner: String!, $repo: String!, $num: Int!) {
          repository(name: $repo, owner: $owner) {
            pullRequest(number: $num) {
                id
                title
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

const updateBranch = async () => {
    if (!pullRequestArray.length) {
        console.log('No pull request for update');
        return;
    }

    const  pullRequest = await getPullRequest(pullRequestArray[0].number);

    console.log('pullRequest', pullRequest.commits.nodes.commit);
    console.log('pullRequest', pullRequest);
    const statuses = await getCombinedSuccess(pullRequestArray[0].number);
    console.log('statuses', statuses);

    if (
        pullRequest.status === 'CONFLICTING' ||
        ['CHANGES_REQUESTED', 'REVIEW_REQUIRED'].includes(pullRequest.reviewDecision)
    ) {
        console.log(`Pull request  №${pullRequest.number} can not be merged`);
        pullRequestArray.shift();
        updateBranch();
        return;
    }
    
    try {
        await octokit.rest.pulls.updateBranch({
            owner: repoOwner,
            repo: repo,
            pull_number: pullRequestArray[0].number,
        }).then(() => {
            console.log(`Pull request  №${ pullRequestArray[0].number} has been updated`);
        });
    } catch (error) {
        pullRequestArray.shift();
        updateBranch();
    };
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

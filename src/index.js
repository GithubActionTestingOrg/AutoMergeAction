const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const token = core.getInput('token');
const octokit = new Octokit({ auth: token });
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo
const baseBranch = github.context.payload.ref
let pullRequestArray = [];

const getPullRequests = async () => {
    const resp = octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repo,
        sort: 'long-running',
        direction: 'desc',
    }).catch(
        e => {
            core.setFailed(e.message)
        }
    )
    return resp;
};

export async function getPullRequest(num) {
    const result = await octokit.graphql(
      `query ($owner: String!, $repo: String!, $num: Int!) {
          repository(name: $repo, owner: $owner) {
            pullRequest(number: $num) {
                id
                title
                baseRefName
                number
                merged
                mergeable
                state
                body
                reviews(first: 100) {
                   nodes {
                        state
                   }
                }
                reviewRequests {
                    totalCount
                }
            }
          }
        }`,
      {
        owner: repoOwner,
        repo: repo,
        num,
      }
    )
    return result.repository.pullRequest
};

const updateBranch = async () => {
    if (!pullRequestArray.length) {
        console.log('No pull request for update');
        return;
    }

    const pullRequest = await getPullRequest(pullRequestArray[0].number);

    if (pullRequest.status === 'CONFLICTING') {
        console.log(`Pull request  №${pullRequest.number} can not be merged`);
        pullRequestArray.shift();
        updateBranch();
    }
    
    console.log(pullRequest);
    console.log(pullRequest.mergeable);

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
        console.warn('error', error);
    };
};

async function main() {
    const pullRequestsList = await getPullRequests();
    const filteredPrs = pullRequestsList.data.filter((pr) => pr.auto_merge !== null);

    pullRequestArray = filteredPrs;

    if (!pullRequestArray.length) {
        console.log('auto-merge prs is not found');
        return
    }

    if (pullRequestArray.error) console.log(pullRequestArray.error);  

    updateBranch();
};

main();
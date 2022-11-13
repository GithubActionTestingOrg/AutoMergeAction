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
              ${pullRequestFragment}
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
    if (github.context.ref === `refs/heads/${baseBranch}`) {
        return {
            type: 'warning',
            msg: 'Commit is already on the destination branch, ignoring',
        };
    }
    pullRequestArray.map((pr) => { console.log(`Pull Request - ${pr.number} ${pr.created_at}`)})

    console.log('****************');
   
    const pullRequest = await getPullRequest(pullRequestArray[0].number);
    console.log('pr', pullRequest);

    try {
        await octokit.rest.pulls.updateBranch({
            owner: repoOwner,
            repo: repo,
            pull_number: pullRequestArray[0].number,
        }).then(() => {
            console.log('updated', pullRequestArray[0].number);
            // console.log('updated', pullRequestArray[0]);
        });
    } catch (error) {
        
        if (pullRequestArray.length) {
            pullRequestArray.shift();
            updateBranch();
        }

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

const checkCount = 50
const labelCount = 10

const pullRequestFragment = `
  id
  title
  baseRefName
  number
  merged
  mergeable
  reviews(states: APPROVED) {
    totalCount
  }
  reviewRequests {
    totalCount
  }
  labels(first: ${labelCount}) {
    nodes {
      name
    }
  }
  commits(last: 1) {
    nodes {
      commit {
        statusCheckRollup {
          contexts(first: ${checkCount}) {
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
  }`

main();
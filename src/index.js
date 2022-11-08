const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const token = core.getInput('token');
const octokit = new Octokit({ auth: token });
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo

const getPullRequests = async () => {
    const resp = octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repo,
    }).catch(
        e => {
            core.setFailed(e.message)
        }
    )
    return resp;
};

const testFunction = async () => {
    const query = `
    query openPullRequests($owner: String!, $repo: String!, $after: String, $baseRefName: String) { 
      repository(owner:$owner, name: $repo) { 
        pullRequests(first: 100, after: $after, states: OPEN, baseRefName: $baseRefName) {
          nodes {
            mergeable
            number
            permalink
            title
            updatedAt
            labels(first: 100) {
              nodes {
                name
              }
            }
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }`;

    const pullsResponse = await octokit.request(query, {
        headers: {},
        after,
        baseRefName: 'main',
        owner: repoOwner,
        repo: repo,
    });

    console.log('query', pullsResponse);

};

const updateBranch = async () => {
    if (github.context.ref === `refs/heads/${branch}`) {
        return {
            type: 'warning',
            msg: 'Commit is already on the destination branch, ignoring',
        };
    }
    
    try {
        await octokit.request(
            'PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch',
            {
                owner: repoOwner,
                repo: repo,
                pull_number: filteredPrs[0].number,
            }
        ).then(() => {
            console.log('updated', filteredPrs[0].number)
        });
    } catch (error) {
        console.warn('error', error);
    }
};

async function main() {
    const pullRequestsList = await getPullRequests();

    const filteredPrs = pullRequestsList.data
        .filter((pr) => pr.auto_merge !== null)
        .sort((a, b) => {
            return Date.parse(b.created_at) - Date.parse(a.created_at);
        })
        .reverse();

    filteredPrs.map((pr) => { console.log(`${pr.number} ${pr.created_at}`)})

    if (!filteredPrs.length) {
        console.log('auto-merge prs is not found');
        return
    }

    // if (filteredPrs.error) console.log(filteredPrs);  
    testFunction();
    // updateBranch();
};



main();
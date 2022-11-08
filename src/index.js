const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require("@octokit/rest");

const token = core.getInput('token');
const octokit = new Octokit({ auth: token });
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo
const baseBranch = github.context.payload.ref

const getPullRequests = async () => {

    const prAllList = await octokit.pulls.list({
        owner: repoOwner,
        repo: repo,
        state: 'open',
    });
    const promises = openedPrs.map(o => octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: o.number,
        per_page: 100,
      }).then(r => ({
        number: o.number,
        files: r.data.map(f => f.filename),
        conflicts: [],
      })));
    
      const allFiles = await Promise.all(promises);
    
    console.log('allFiles', allFiles);

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

const updateBranch = async (filteredPrs) => {
    if (github.context.ref === `refs/heads/${baseBranch}`) {
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

    if (filteredPrs.error) console.log(filteredPrs.error);  
    updateBranch(filteredPrs);
};



main();
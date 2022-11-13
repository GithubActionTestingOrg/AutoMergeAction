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

const updateBranch = async () => {
    if (github.context.ref === `refs/heads/${baseBranch}`) {
        return {
            type: 'warning',
            msg: 'Commit is already on the destination branch, ignoring',
        };
    }
    console.log(pullRequestArray);
    console.log('****************');
    try {
        await octokit.rest.pulls.updateBranch({
            owner: repoOwner,
            repo: repo,
            pull_number: pr.number,
        }).then(() => {
            console.log('updated', pr.number);
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

    filteredPrs.map((pr) => { console.log(`Pull Request - ${pr.number} ${pr.created_at}`)})

    if (!pullRequestArray.length) {
        console.log('auto-merge prs is not found');
        return
    }
    if (pullRequestArray.error) console.log(pullRequestArray.error);  
    updateBranch();
};

main();
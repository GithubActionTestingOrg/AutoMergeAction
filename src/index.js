const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = new github.getOctokit(token);
const baseBranch = github.context.payload.ref
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
}

async function main() {

    const pullRequestsList = await getPullRequests();

    const filteredPrs = pullRequestsList.data
        .filter((pr) => pr.auto_merge !== null)
        .sort((a, b) => {
            return Date.parse(b.created_at) - Date.parse(a.created_at);
        }
    );

    console.log('filteredPrs', filteredPrs);
    
    await Promise.resolve(
            octokit.pulls.updateBranch({
                ...github.context.repo,
                pull_number: filteredPrs[0].number,
            })
    )
}

main();
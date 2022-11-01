const core = require('@actions/core');
const github = require('@actions/github');


async function main() {
    const token = core.getInput('token');
    const octokit = new github.getOctokit(token);
    const baseBranch = github.context.payload.ref
    const repoOwner = github.context.repo.owner
    const repo = github.context.repo.repo

    let resp = octokit.rest.pulls.list({
        owner: repoOwner,
        repo: repo,
    }).catch(
        e => {
            core.setFailed(e.message)
        }
    )

    // const sortedPrByDate = prs.sort((a, b) => {
    //     return Date.parse(a) > Date.parse(b);
    // });
    
    // await Promise.resolve(
    //         octokit.pulls.updateBranch({
    //             ...github.context.repo,
    //             pull_number: sortedPrByDate[0].number,
    //         })
    // )
    console.log('resp', resp);
}

main();
const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = new github.getOctokit(token);
const baseBranch = github.context.payload.ref
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo

 const getPrs = async () => {
    const {data: resp} = octokit.rest.pulls.list({
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

    const prs = await getPrs();
    console.log('prs', prs);
    // const sortedPrByDate = prs.sort((a, b) => {
    //     return Date.parse(a) > Date.parse(b);
    // });
    
    // await Promise.resolve(
    //         octokit.pulls.updateBranch({
    //             ...github.context.repo,
    //             pull_number: sortedPrByDate[0].number,
    //         })
    // )
}

main();
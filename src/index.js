const core = require('@actions/core');
const github = require('@actions/github');

const token = core.getInput('token');
const octokit = new github.getOctokit(token);
const baseBranch = github.context.payload.ref
const repoOwner = github.context.repo.owner
const repo = github.context.repo.repo

 const getPrs = async () => {
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

    const prs = await getPrs();

    const filteredPrs = prs.data.filter((pr) => pr.auto_merge !== null);
    console.log('filteredPrs', filteredPrs);

    const sortedPrByDate = filteredPrs.sort((a, b) => {
        return Date.parse(b) > Date.parse(a);
    });
    console.log('sortedPrByDate', sortedPrByDate);
    
    // await Promise.resolve(
    //         octokit.pulls.updateBranch({
    //             ...github.context.repo,
    //             pull_number: sortedPrByDate[0].number,
    //         })
    // )
}

main();
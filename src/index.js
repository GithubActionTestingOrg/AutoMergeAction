const core = require('@actions/core');
const github = require('@actions/github');


async function main() {
    const token = core.getInput('token');
    const octokit = new github.getOctokit(token);
    const baseBranch = github.context.payload.ref

    const { data: prs } = await octokit.rest.pulls.list({
        ...github.context.repo,
        base: baseBranch,
        state: 'open',
    });

    console.log(prs)
    
    // const pullsResponse = await client.pulls.list({
    //     ...github.context.repo,
    //     base: baseBranch,
    //     state: 'open',
    // })
    // const prs = pullsResponse.data

    // const sortedPrByDate = prs.sort((a, b) => {
    //     return Date.parse(a) > Date.parse(b);
    // });
    
    // await Promise.resolve(
    //         client.pulls.updateBranch({
    //             ...github.context.repo,
    //             pull_number: sortedPrByDate[0].number,
    //         })
    // )
}

main();
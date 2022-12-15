export async function getPullRequest(octokit, num, repoOwner, repo) {
    const result = await octokit.graphql(
        `query ($owner: String!, $repo: String!, $num: Int!) {
          repository(name: $repo, owner: $owner) {
            pullRequest(number: $num) {
                id
                title
                commits(last: 1) {
                    nodes {
                      commit {
                        statusCheckRollup {
                          contexts(first: 30) {
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
                }
                baseRefName
                number
                reviewDecision
            }
          }
        }`,
        {
            owner: repoOwner,
            repo: repo,
            num,
        }
    );

    
    return  result.repository.pullRequest
};
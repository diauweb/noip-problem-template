import dot from 'dot'
import fse from 'fs-extra'
import path from 'path'
import rehypeStringify from 'rehype-stringify'
import { remark } from 'remark'
import remarkDirective from 'remark-directive'
import remarkFrontmatter from 'remark-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import { visit } from 'unist-util-visit'
import YAML from 'yaml'
const { readFile, writeFile } = fse;

const config = YAML.parse((await readFile("./config.yml")).toString())
console.log(config)

async function renderMd(filename) {
    let frontmatter = undefined
    const html = await remark()
        .use(remarkDirective)
        .use(remarkFrontmatter)
        .use(remarkGfm)
        .use(function () {
            return function (ast) {
                if (ast.children[0].type === 'yaml') {
                    frontmatter = YAML.parse(ast.children[0].value)
                }
            }
        })
        .use(function () {
            return function (ast) {
                visit(ast, 'heading', function (node) {
                    if (node.depth == 2) {
                        node.children = [
                            { type: 'text', value: '【' },
                            ...node.children,
                            { type: 'text', value: '】' },
                        ]
                        node.depth = 3
                        node.data = {
                            hProperties: { className: ['para'] }
                        }
                    }
                })
            }
        })
        .use(remarkRehype)
        .use(rehypeStringify)
        .process((await readFile(path.join('docs', filename))).toString())

    return { html, frontmatter }
}

const out = dot.compile((await readFile('./index.html')).toString())
const problems = await Promise.all(config.problems.map(e => renderMd(e)))

const text = out({
    ...config,
    attentionMd: (await renderMd(config.attention)).html,
    problems
})

await writeFile('./problem.html', text)

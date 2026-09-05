/**
 * Split a SQL file into statements.
 *
 * The naive `text.split(';')` this replaces broke on a semicolon inside a
 * comment — which is easy to write and gives a baffling error, because the
 * fragment it produces is prose rather than SQL. It also could not handle the
 * dollar-quoted DO blocks the migration needs.
 *
 * So: walk the text, skip over the places a semicolon does not mean "end of
 * statement" (line comments, block comments, string literals, dollar-quoted
 * bodies), and cut on the ones that do.
 */
export function splitStatements(sql) {
  const out = []
  let start = 0
  let i = 0

  while (i < sql.length) {
    const two = sql.slice(i, i + 2)

    if (two === '--') {
      const nl = sql.indexOf('\n', i)
      i = nl === -1 ? sql.length : nl + 1
      continue
    }

    if (two === '/*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      continue
    }

    if (sql[i] === "'") {
      i++
      while (i < sql.length) {
        if (sql[i] === "'") {
          // '' is an escaped quote, not the end of the literal.
          if (sql[i + 1] === "'") i += 2
          else {
            i++
            break
          }
        } else i++
      }
      continue
    }

    // $$ … $$ or $tag$ … $tag$
    if (sql[i] === '$') {
      const tag = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(sql.slice(i))
      if (tag) {
        const close = sql.indexOf(tag[0], i + tag[0].length)
        i = close === -1 ? sql.length : close + tag[0].length
        continue
      }
    }

    if (sql[i] === ';') {
      out.push(sql.slice(start, i))
      start = i + 1
    }
    i++
  }

  out.push(sql.slice(start))

  // Drop anything that is only comments and whitespace.
  return out
    .map((s) => s.trim())
    .filter((s) => s && stripComments(s).trim().length > 0)
}

function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

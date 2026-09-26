import fs from "fs"
import path from "path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

const ADMIN_AUTH_PATTERN =
  /authorizeAPI\s*\(\s*\[\s*["']ADMIN["']\s*\]\s*\)/
const ADMIN_GUARD_CALL_PATTERN =
  /(?:authorizeAPI\s*\(\s*\[\s*["']ADMIN["']\s*\]\s*\)|requireAdminAction\s*\()/

function listSourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(root, entry.name)
    if (entry.isDirectory()) return listSourceFiles(absolutePath)
    return /\.(ts|tsx)$/.test(entry.name) ? [absolutePath] : []
  })
}

function relativePath(file: string) {
  return path.relative(process.cwd(), file).split(path.sep).join("/")
}

function hasUseServerDirective(statements: ts.NodeArray<ts.Statement>) {
  const first = statements[0]
  return Boolean(
    first &&
      ts.isExpressionStatement(first) &&
      ts.isStringLiteral(first.expression) &&
      first.expression.text === "use server"
  )
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind) {
  return (
    ts.canHaveModifiers(node) &&
    Boolean(ts.getModifiers(node)?.some((modifier) => modifier.kind === kind))
  )
}

function isAsync(node: ts.Node) {
  return hasModifier(node, ts.SyntaxKind.AsyncKeyword)
}

function isExported(node: ts.Node) {
  return hasModifier(node, ts.SyntaxKind.ExportKeyword)
}

function actionName(node: ts.Node) {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isMethodDeclaration(node)) &&
    node.name
  ) {
    return node.name.getText()
  }
  if (
    (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text
  }
  return "<inline>"
}

type ServerAction = {
  name: string
  source: string
}

function collectServerActions(file: string, source: string): ServerAction[] {
  const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  )
  const actions: ServerAction[] = []
  const moduleUseServer = hasUseServerDirective(sourceFile.statements)

  if (moduleUseServer) {
    for (const statement of sourceFile.statements) {
      if (
        ts.isFunctionDeclaration(statement) &&
        isExported(statement) &&
        isAsync(statement) &&
        statement.body
      ) {
        actions.push({
          name: actionName(statement),
          source: statement.getText(sourceFile),
        })
      }

      if (ts.isVariableStatement(statement) && isExported(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          const initializer = declaration.initializer
          if (
            initializer &&
            (ts.isArrowFunction(initializer) ||
              ts.isFunctionExpression(initializer)) &&
            isAsync(initializer)
          ) {
            actions.push({
              name: declaration.name.getText(sourceFile),
              source: declaration.getText(sourceFile),
            })
          }
        }
      }
    }
  }

  function visit(node: ts.Node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.body &&
      ts.isBlock(node.body) &&
      hasUseServerDirective(node.body.statements)
    ) {
      actions.push({
        name: actionName(node),
        source: node.getText(sourceFile),
      })
    }

    ts.forEachChild(node, visit)
  }

  ts.forEachChild(sourceFile, visit)
  return actions
}

describe("admin server action authorization contract", () => {
  it("requires reviewed current-account ADMIN authorization for every server action", () => {
    const adminRoot = path.join(process.cwd(), "src", "app", "admin")
    const offenders: string[] = []

    for (const file of listSourceFiles(adminRoot)) {
      const source = fs.readFileSync(file, "utf8")
      const actions = collectServerActions(file, source)

      if (
        actions.some((action) =>
          /requireAdminAction\s*\(/.test(action.source)
        ) &&
        !ADMIN_AUTH_PATTERN.test(source)
      ) {
        offenders.push(
          `${relativePath(file)}: requireAdminAction() is not backed by authorizeAPI(["ADMIN"])`
        )
      }

      for (const action of actions) {
        if (/await\s+auth\s*\(/.test(action.source)) {
          offenders.push(
            `${relativePath(file)}:${action.name} uses JWT-only auth() inside a server action`
          )
        }

        if (!ADMIN_GUARD_CALL_PATTERN.test(action.source)) {
          offenders.push(
            `${relativePath(file)}:${action.name} does not invoke an ADMIN guard`
          )
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

---
description: Prüft den aktuellen Branch gegen origin/dev mit dem Review-Agenten (nur lesend)
argument-hint: [PR-Nummer, optional]
context: fork
agent: code-reviewer
background: false
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status *) Bash(git branch *) Bash(gh pr view *) Bash(head *) Bash(wc *)
---
Prüfe den folgenden Stand nach deiner Checkliste und gib deinen Bericht in der
vorgeschriebenen Form zurück. Der Diff steht unten im Wortlaut.

Ist die Größe des Diffs unten größer als 200000 Bytes, ist der Diff nach
200000 Bytes abgeschnitten: Melde „Diff gekürzt“ unter „Nicht geprüft“. Die Liste
der geänderten Dateien ist vollständig, den Rest kannst du mit Read nachlesen.
Lockfiles sind aus dem Diff ausgenommen. `origin/dev` ist der Stand vom letzten
`git fetch`; der Befehl holt nichts selbst.

Branch: !`git branch --show-current`

Commits gegen dev: !`git log --oneline origin/dev..HEAD`

Geänderte Dateien: !`git diff --stat origin/dev...HEAD -- . ':(exclude)package-lock.json' ':(exclude)yarn.lock' ':(exclude)pnpm-lock.yaml'`

Lokale, nicht committete Änderungen: !`git status --short`

PR-Text (nur wenn eine PR-Nummer übergeben wurde): !`gh pr view $ARGUMENTS --json title,body 2>/dev/null || true`

Größe des Diffs in Bytes: !`git diff origin/dev...HEAD -- . ':(exclude)package-lock.json' ':(exclude)yarn.lock' ':(exclude)pnpm-lock.yaml' | wc -c`

Diff (höchstens 200000 Bytes):

!`git diff origin/dev...HEAD -- . ':(exclude)package-lock.json' ':(exclude)yarn.lock' ':(exclude)pnpm-lock.yaml' | head -c 200000`

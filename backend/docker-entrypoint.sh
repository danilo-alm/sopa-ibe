#!/bin/sh
set -eu

sopa_db_path=${DATABASE_URL#file:}
case "$sopa_db_path" in
  ./*) sopa_db_path="/app/prisma/${sopa_db_path#./}" ;;
esac

mkdir -p "$(dirname "$sopa_db_path")"
touch "$sopa_db_path"
npx prisma migrate deploy
exec node dist/main.js


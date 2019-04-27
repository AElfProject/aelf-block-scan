# Quike Start

https://github.com/protocolbuffers/protobuf/tree/master/js

## How to use

protoc --js_out=import_style=commonjs,binary:. messages.proto base.proto

## How to use pbjs

node ./node_modules/@aelfqueen/protobufjs/bin/pbjs -t json ./proto/common.proto > ./proto/common.proto.json

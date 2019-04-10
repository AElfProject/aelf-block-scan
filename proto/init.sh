# TODO: JS 脚本. 整理下格式。
protoc --js_out=import_style=commonjs,binary:. common.proto

node ../node_modules/@aelfqueen/protobufjs/bin/pbjs -t json ../proto/common.proto > ../proto/common.proto.json
node ../node_modules/@aelfqueen/protobufjs/bin/pbjs -t json ../proto/token_contract.proto > ../proto/token_contract.proto.json
node ../node_modules/@aelfqueen/protobufjs/bin/pbjs -t json ../proto/token_converter_contract.proto > ../proto/token_converter_contract.proto.json
node ../node_modules/@aelfqueen/protobufjs/bin/pbjs -t json ../proto/kernel.proto > ../proto/kernel.proto.json
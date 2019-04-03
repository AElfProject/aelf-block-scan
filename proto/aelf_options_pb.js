/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

var google_protobuf_descriptor_pb = require('google-protobuf/google/protobuf/descriptor_pb.js');
goog.exportSymbol('proto.aelf.csharpState', null, global);
goog.exportSymbol('proto.aelf.isEvent', null, global);
goog.exportSymbol('proto.aelf.isIndexed', null, global);
goog.exportSymbol('proto.aelf.isView', null, global);

/**
 * A tuple of {field number, class constructor} for the extension
 * field named `csharpState`.
 * @type {!jspb.ExtensionFieldInfo.<string>}
 */
proto.aelf.csharpState = new jspb.ExtensionFieldInfo(
    238149,
    {csharpState: 0},
    null,
     /** @type {?function((boolean|undefined),!jspb.Message=): !Object} */ (
         null),
    0);

google_protobuf_descriptor_pb.ServiceOptions.extensionsBinary[238149] = new jspb.ExtensionFieldBinaryInfo(
    proto.aelf.csharpState,
    jspb.BinaryReader.prototype.readString,
    jspb.BinaryWriter.prototype.writeString,
    undefined,
    undefined,
    false);
// This registers the extension field with the extended class, so that
// toObject() will function correctly.
google_protobuf_descriptor_pb.ServiceOptions.extensions[238149] = proto.aelf.csharpState;


/**
 * A tuple of {field number, class constructor} for the extension
 * field named `isView`.
 * @type {!jspb.ExtensionFieldInfo.<boolean>}
 */
proto.aelf.isView = new jspb.ExtensionFieldInfo(
    342891,
    {isView: 0},
    null,
     /** @type {?function((boolean|undefined),!jspb.Message=): !Object} */ (
         null),
    0);

google_protobuf_descriptor_pb.MethodOptions.extensionsBinary[342891] = new jspb.ExtensionFieldBinaryInfo(
    proto.aelf.isView,
    jspb.BinaryReader.prototype.readBool,
    jspb.BinaryWriter.prototype.writeBool,
    undefined,
    undefined,
    false);
// This registers the extension field with the extended class, so that
// toObject() will function correctly.
google_protobuf_descriptor_pb.MethodOptions.extensions[342891] = proto.aelf.isView;


/**
 * A tuple of {field number, class constructor} for the extension
 * field named `isEvent`.
 * @type {!jspb.ExtensionFieldInfo.<boolean>}
 */
proto.aelf.isEvent = new jspb.ExtensionFieldInfo(
    839427,
    {isEvent: 0},
    null,
     /** @type {?function((boolean|undefined),!jspb.Message=): !Object} */ (
         null),
    0);

google_protobuf_descriptor_pb.MessageOptions.extensionsBinary[839427] = new jspb.ExtensionFieldBinaryInfo(
    proto.aelf.isEvent,
    jspb.BinaryReader.prototype.readBool,
    jspb.BinaryWriter.prototype.writeBool,
    undefined,
    undefined,
    false);
// This registers the extension field with the extended class, so that
// toObject() will function correctly.
google_protobuf_descriptor_pb.MessageOptions.extensions[839427] = proto.aelf.isEvent;


/**
 * A tuple of {field number, class constructor} for the extension
 * field named `isIndexed`.
 * @type {!jspb.ExtensionFieldInfo.<boolean>}
 */
proto.aelf.isIndexed = new jspb.ExtensionFieldInfo(
    543129,
    {isIndexed: 0},
    null,
     /** @type {?function((boolean|undefined),!jspb.Message=): !Object} */ (
         null),
    0);

google_protobuf_descriptor_pb.FieldOptions.extensionsBinary[543129] = new jspb.ExtensionFieldBinaryInfo(
    proto.aelf.isIndexed,
    jspb.BinaryReader.prototype.readBool,
    jspb.BinaryWriter.prototype.writeBool,
    undefined,
    undefined,
    false);
// This registers the extension field with the extended class, so that
// toObject() will function correctly.
google_protobuf_descriptor_pb.FieldOptions.extensions[543129] = proto.aelf.isIndexed;

goog.object.extend(exports, proto.aelf);

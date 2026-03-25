declare module "yazl" {
  import { Readable } from "node:stream";

  export class ZipFile {
    outputStream: Readable;
    addFile(path: string, metadataPath: string): void;
    addBuffer(buffer: Buffer, metadataPath: string): void;
    end(): void;
  }
}

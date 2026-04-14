declare module 'text-encoding' {
    export class TextEncoder {
        constructor(label?: string, options?: { fatal?: boolean });
        encoding: string;
        encode(input?: string, options?: { stream?: boolean }): Uint8Array;
    }
    export class TextDecoder {
        constructor(label?: string, options?: { fatal?: boolean, ignoreBOM?: boolean });
        encoding: string;
        fatal: boolean;
        ignoreBOM: boolean;
        decode(input?: Uint8Array, options?: { stream?: boolean }): string;
    }
}


interface ConsolistRenderOptions {
    colorMode?: "color" | "bw";
    terminal?: "browser" | "ansi24" | "ansi8" | "dumb";
}

interface ConsolistLoggingOptions extends ConsolistRenderOptions {
    logger?: (format: string, ...optionalParams: any[]) => void;
}

interface ConsolistImageData {
    data: ArrayLike<number>;
    width: number;
    height: number;
}

type ConsolistImage =
    HTMLImageElement |
    HTMLCanvasElement |
    ImageData |
    ConsolistImageData;

interface ConsolistStatic {
    render(image: ConsolistImage, options?: ConsolistRenderOptions): string[];
    log(image: ConsolistImage, options?: ConsolistLoggingOptions): void;
}

declare module "consolist" {
    export = Consolist;
}
declare const Consolist: ConsolistStatic;

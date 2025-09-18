// Global type declarations for custom elements

declare namespace JSX {
  interface IntrinsicElements {
    'dotlottie-wc': {
      src: string;
      style?: React.CSSProperties;
      autoplay?: boolean;
      loop?: boolean;
      children?: React.ReactNode;
    };
  }
}
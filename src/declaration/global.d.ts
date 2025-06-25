export {};

declare global {
  interface Window {
    ui: {
      preauthorizeApiKey: (key: string, token: string) => void;
    };
  }
}

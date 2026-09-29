declare module '@capacitor/core' {
  export const Capacitor: {
    isNativePlatform: () => boolean;
    getPlatform: () => string;
    isPluginAvailable: (name: string) => boolean;
  };
}

declare module '@capacitor/app' {
  export interface BackButtonListenerEvent {
    canGoBack: boolean;
  }
  export const App: {
    addListener: (eventName: 'backButton', listener: (event: BackButtonListenerEvent) => void) => Promise<{ remove: () => Promise<void> }>;
    exitApp: () => Promise<void>;
  };
}

declare module '@capacitor/status-bar' {
  export enum Style {
    Dark = 'DARK',
    Light = 'LIGHT',
    Default = 'DEFAULT'
  }
  export const StatusBar: {
    setStyle: (options: { style: Style }) => Promise<void>;
    setBackgroundColor: (options: { color: string }) => Promise<void>;
  };
}

declare module '@capacitor/keyboard' {
  export enum KeyboardResize {
    Body = 'body',
    Ionic = 'ionic',
    Native = 'native',
    None = 'none'
  }
  export const Keyboard: {
    setResizeMode: (options: { mode: KeyboardResize }) => Promise<void>;
  };
}

declare module '@capacitor/browser' {
  export const Browser: {
    open: (options: { url: string; windowName?: string }) => Promise<void>;
    close: () => Promise<void>;
  };
}

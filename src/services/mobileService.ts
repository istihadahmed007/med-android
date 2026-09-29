import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { Browser } from '@capacitor/browser';

export interface MobileBackHandlerOptions {
  isModalOpen?: boolean;
  closeModals?: () => void;
  canNavigateBack?: boolean;
  onNavigateBack?: () => void;
}

export class MobileService {
  private static isInitialized = false;

  public static isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public static isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  /**
   * Initializes native Android StatusBar, Keyboard, and external link handling
   */
  public static async init(): Promise<void> {
    if (!this.isNative() || this.isInitialized) return;
    this.isInitialized = true;

    try {
      // 1. Android Status Bar styling (Dark theme with MEDX dark navy brand background)
      if (Capacitor.isPluginAvailable('StatusBar')) {
        await StatusBar.setStyle({ style: Style.Dark });
        if (this.isAndroid()) {
          await StatusBar.setBackgroundColor({ color: '#06172E' });
        }
      }
    } catch (e) {
      console.warn('MobileService: StatusBar setup error', e);
    }

    try {
      // 2. Android Keyboard behavior (adjust webview body resize)
      if (Capacitor.isPluginAvailable('Keyboard')) {
        await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
      }
    } catch (e) {
      console.warn('MobileService: Keyboard setup error', e);
    }

    // 3. Intercept external link clicks to keep WebView stable
    this.setupExternalLinkInterception();
  }

  /**
   * Configures Android hardware back button handler
   */
  public static setupBackButton(options: MobileBackHandlerOptions): () => void {
    if (!this.isNative() || !Capacitor.isPluginAvailable('App')) {
      return () => {};
    }

    const listenerPromise = CapApp.addListener('backButton', () => {
      // Priority 1: Close active modals/overlays if open
      if (options.isModalOpen && options.closeModals) {
        options.closeModals();
        return;
      }

      // Priority 2: Navigate back to previous section or dashboard
      if (options.canNavigateBack && options.onNavigateBack) {
        options.onNavigateBack();
        return;
      }

      // Priority 3: Minimize or exit app if at root dashboard
      CapApp.exitApp();
    });

    return () => {
      listenerPromise.then(handler => handler.remove()).catch(() => {});
    };
  }

  /**
   * Intercepts external navigation so YouTube/Pubmed/etc. open in system browser
   */
  private static setupExternalLinkInterception(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', async (event: MouseEvent) => {
      const target = (event.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (!href) return;

      // Handle external http/https links
      if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          const currentOrigin = window.location.origin;
          const url = new URL(href);

          // If link is external to the app's localhost/origin
          if (url.origin !== currentOrigin && !url.hostname.includes('localhost')) {
            event.preventDefault();
            event.stopPropagation();
            if (Capacitor.isPluginAvailable('Browser')) {
              await Browser.open({ url: href });
            } else {
              window.open(href, '_system');
            }
          }
        } catch {
          // If URL parsing fails, let standard handler proceed
        }
      }
    }, true);
  }
}

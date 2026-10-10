"use client";
import "@openuidev/react-ui/styles/index.css";

import {
  AgentInterface,
  createTheme,
  fetchLLM,
  openAIAdapter,
  openAIMessageFormat,
  useSystemThemeMode,
} from "@openuidev/react-ui";
import { openuiLibrary } from "@openuidev/react-ui/genui-lib";
import { useEffect, useState } from "react";

const llm = fetchLLM({
  url: "/api/chat",
  streamAdapter: openAIAdapter(),
  messageFormat: openAIMessageFormat,
});

// Fixed zoom-out for the generated UI. Lower = smaller, so more of the
// generated interface fits on screen at once.
const UI_ZOOM = 0.75;

type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  colorScheme?: "light" | "dark";
  themeParams?: TelegramThemeParams;
  onEvent?: (
    eventType: string,
    handler: (event: { theme_params?: TelegramThemeParams }) => void,
  ) => void;
  offEvent?: (
    eventType: string,
    handler: (event: { theme_params?: TelegramThemeParams }) => void,
  ) => void;
};

function getTelegramWebApp(): TelegramWebApp | undefined {
  if (typeof window === "undefined") return undefined;

  return (
    window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
  ).Telegram?.WebApp;
}

function mapTelegramTheme(params: TelegramThemeParams) {
  const accent = params.button_color ?? params.link_color;

  return createTheme({
    background: params.bg_color,
    foreground: params.secondary_bg_color,
    popoverBackground: params.secondary_bg_color,
    textNeutralPrimary: params.text_color,
    textNeutralSecondary: params.hint_color,
    textNeutralLink: params.link_color,
    textAccentPrimary: params.button_text_color,
    interactiveAccentDefault: accent,
    interactiveAccentHover: accent,
    interactiveAccentPressed: accent,
  });
}

export default function Home() {
  const systemMode = useSystemThemeMode();
  const [telegramTheme, setTelegramTheme] = useState<{
    mode: "light" | "dark";
    theme: ReturnType<typeof mapTelegramTheme>;
  } | null>(null);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;

    // Telegram Mini App bootstrapping: tell the client we are ready and
    // expand the view to the full available height.
    webApp.ready?.();
    webApp.expand?.();

    const applyTelegramTheme = () => {
      const mode =
        webApp.colorScheme === "dark" || webApp.colorScheme === "light"
          ? webApp.colorScheme
          : null;
      const params = webApp.themeParams;

      if (mode && params) {
        setTelegramTheme({ mode, theme: mapTelegramTheme(params) });
      }
    };

    applyTelegramTheme();
    webApp.onEvent?.("themeChanged", applyTelegramTheme);

    return () => {
      webApp.offEvent?.("themeChanged", applyTelegramTheme);
    };
  }, []);

  const mode = telegramTheme?.mode ?? systemMode;

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <div
        style={{
          width: `${100 / UI_ZOOM}vw`,
          height: `${100 / UI_ZOOM}vh`,
          transform: `scale(${UI_ZOOM})`,
          transformOrigin: "top left",
        }}
      >
        <AgentInterface
          llm={llm}
          componentLibrary={openuiLibrary}
          agentName="OpenUI Self Hosted"
          theme={
            telegramTheme
              ? {
                  mode,
                  lightTheme: telegramTheme.theme,
                  darkTheme: telegramTheme.theme,
                }
              : { mode }
          }
        />
      </div>
    </div>
  );
}

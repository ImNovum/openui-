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

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

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
  const [zoom, setZoom] = useState(1);

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

  const zoomBy = (delta: number) => {
    setZoom((current) => {
      const next = Math.round((current + delta) * 100) / 100;
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    });
  };

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden", position: "relative" }}>
      <div
        style={{
          width: `${100 / zoom}vw`,
          height: `${100 / zoom}vh`,
          transform: `scale(${zoom})`,
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

      {/* Zoom controls — kept outside the scaled container so they stay full size */}
      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 100,
          display: "flex",
          gap: 6,
          alignItems: "center",
          background: "rgba(0,0,0,0.55)",
          borderRadius: 999,
          padding: "4px 6px",
        }}
      >
        <button
          onClick={() => zoomBy(-ZOOM_STEP)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.9)",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          onClick={() => setZoom(1)}
          style={{
            minWidth: 52,
            height: 34,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.9)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => zoomBy(ZOOM_STEP)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            border: "none",
            background: "rgba(255,255,255,0.9)",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </div>
  );
}

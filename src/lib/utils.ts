import { clsx, type ClassValue } from "clsx";
import { Exchange } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return `${(price * 100).toFixed(1)}¢`;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(0)}K`;
  return `$${volume}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(dateStr: string): string {
  const now = new Date();
  const then = new Date(dateStr);
  const diff = now.getTime() - then.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function exchangeColor(exchange: Exchange): string {
  switch (exchange) {
    case "kalshi":
      return "text-blue-400";
    case "polymarket":
      return "text-purple-400";
    case "gemini":
      return "text-cyan-400";
  }
}

export function exchangeBgColor(exchange: Exchange): string {
  switch (exchange) {
    case "kalshi":
      return "bg-blue-500/10 border-blue-500/20";
    case "polymarket":
      return "bg-purple-500/10 border-purple-500/20";
    case "gemini":
      return "bg-cyan-500/10 border-cyan-500/20";
  }
}

export function exchangeLabel(exchange: Exchange): string {
  switch (exchange) {
    case "kalshi":
      return "KALSHI";
    case "polymarket":
      return "POLY";
    case "gemini":
      return "GEMINI";
  }
}

export function edgeColor(edge: number): string {
  if (edge >= 5) return "text-terminal-green glow-green";
  if (edge >= 3) return "text-terminal-accent";
  return "text-terminal-muted";
}

export function directionIcon(direction: string): string {
  switch (direction) {
    case "yes_up":
      return "▲";
    case "yes_down":
      return "▼";
    case "mixed":
      return "◆";
    default:
      return "○";
  }
}

export function directionColor(direction: string): string {
  switch (direction) {
    case "yes_up":
      return "text-terminal-green";
    case "yes_down":
      return "text-terminal-red";
    case "mixed":
      return "text-terminal-accent";
    default:
      return "text-terminal-muted";
  }
}

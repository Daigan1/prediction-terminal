"use client";

import Header from "@/components/Header";
import TerminalLayout from "@/components/TerminalLayout";
import TradeModal from "@/components/TradeModal";
import SettingsPanel from "@/components/SettingsPanel";
import StatusBar from "@/components/StatusBar";

export default function Home() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      <TerminalLayout />
      <StatusBar />
      <TradeModal />
      <SettingsPanel />
    </div>
  );
}

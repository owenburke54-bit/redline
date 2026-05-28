"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-40 rounded border border-border/40 bg-card">
          <p className="text-[11px] text-muted-foreground/50">
            {this.props.label ?? "Chart"} couldn&apos;t load.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

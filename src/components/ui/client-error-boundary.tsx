"use client";

import * as React from "react";

type ClientErrorBoundaryProps = {
  children: React.ReactNode;
  fallback:
    | React.ReactNode
    | ((args: {
        error: Error | null;
        reset: () => void;
      }) => React.ReactNode);
  resetKeys?: readonly unknown[];
};

type ClientErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ClientErrorBoundary extends React.Component<
  ClientErrorBoundaryProps,
  ClientErrorBoundaryState
> {
  state: ClientErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return { hasError: true, error: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error });
    console.error("[client-error-boundary] component crash", {
      error,
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(prevProps: ClientErrorBoundaryProps) {
    if (!this.state.hasError) return;
    if (!this.didResetKeysChange(prevProps.resetKeys, this.props.resetKeys)) return;
    this.reset();
  }

  private didResetKeysChange(
    prevResetKeys: readonly unknown[] | undefined,
    nextResetKeys: readonly unknown[] | undefined,
  ) {
    const prev = prevResetKeys ?? [];
    const next = nextResetKeys ?? [];
    if (prev.length !== next.length) return true;
    for (let index = 0; index < prev.length; index += 1) {
      if (!Object.is(prev[index], next[index])) return true;
    }
    return false;
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback({
          error: this.state.error,
          reset: this.reset,
        });
      }
      return this.props.fallback;
    }
    return this.props.children;
  }
}

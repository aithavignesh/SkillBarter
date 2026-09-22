import React from 'react';
import { Button } from './Button';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('SkillBarter application error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 text-[#17233b]">
        <section className="w-full max-w-md border border-[#dedfdd] bg-white p-7 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d31d24]">Something went wrong</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em]">SkillBarter needs a quick refresh.</h1>
          <p className="mt-3 text-sm leading-6 text-[#697386]">
            The page hit an unexpected error. Your account data is not shown here. Refresh and try the action again.
          </p>
          <Button type="button" className="mt-6" onClick={this.handleReload}>Refresh SkillBarter</Button>
        </section>
      </main>
    );
  }
}

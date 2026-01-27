import React from 'react';
import { GameBoard } from './components/game/GameBoard';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong.</h1>
          <div className="bg-black/50 p-4 rounded-lg font-mono text-sm border border-red-500/30 overflow-auto max-w-full">
            {this.state.error?.toString()}
            <br />
            {this.state.error?.stack && <pre className="mt-2 text-xs text-slate-400">{this.state.error.stack}</pre>}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-bold"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <GameBoard />
    </ErrorBoundary>
  );
}

export default App;

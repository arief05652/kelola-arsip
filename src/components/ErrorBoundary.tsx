import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Keeps a render error from blanking the whole window. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center bg-slate-100 p-6">
          <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-800">Terjadi kesalahan</p>
            <p className="mt-1 break-words text-xs text-slate-500">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-3 rounded-md bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700"
            >
              Muat ulang tampilan
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

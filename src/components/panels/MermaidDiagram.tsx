import React, { useEffect, useId, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  dark: boolean;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, dark }) => {
  const uid = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    import('mermaid')
      .then(({ default: mermaid }) => {
        if (!active) return null;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          themeVariables: dark
            ? {
                primaryColor: '#27272a',
                primaryTextColor: '#f4f4f5',
                primaryBorderColor: '#52525b',
                lineColor: '#a1a1aa',
                secondaryColor: '#18181b',
                tertiaryColor: '#27272a',
                background: '#18181b',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12px',
              }
            : {
                primaryColor: '#f4f4f5',
                primaryTextColor: '#18181b',
                primaryBorderColor: '#d4d4d8',
                lineColor: '#71717a',
                secondaryColor: '#ffffff',
                tertiaryColor: '#f4f4f5',
                background: '#fafafa',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: '12px',
              },
        });
        return mermaid.render(`mmd-${uid}-${dark ? 'd' : 'l'}`, chart);
      })
      .then((res) => {
        if (active && res) {
          setSvg(res.svg);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) setError(String(err));
      });

    return () => {
      active = false;
    };
  }, [chart, uid, dark]);

  if (error) {
    return (
      <pre className="p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 overflow-x-auto">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-400">
        Cargando diagrama...
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl bg-zinc-50 dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 overflow-x-auto [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

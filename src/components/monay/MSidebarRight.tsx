import type { ReactNode } from 'react';

export default function MSidebarRight({
  children,
  width = 300,
}: {
  children: ReactNode;
  width?: number;
}) {
  return (
    <aside style={{
      width, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      gap: 14, minWidth: 0,
    }}>
      {children}
    </aside>
  );
}

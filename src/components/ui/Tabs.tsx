'use client';

import React, { forwardRef } from 'react';

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}

interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {}

interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const TabsContext = React.createContext<{
  value: string;
  onChange: (value: string) => void;
} | null>(null);

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ className = '', defaultValue, value, onChange, children, ...props }, ref) => {
    const [controlledValue, setControlledValue] = React.useState(value || defaultValue || '');
    
    const handleChange = (newValue: string) => {
      if (value === undefined) {
        setControlledValue(newValue);
      }
      onChange?.(newValue);
    };

    const contextValue = React.useMemo(() => ({
      value: value ?? controlledValue,
      onChange: handleChange,
    }), [value, controlledValue]);

    return (
      <TabsContext.Provider value={contextValue}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

export const TabList = forwardRef<HTMLDivElement, TabListProps>(
  ({ className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={`inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
TabList.displayName = 'TabList';

export const Tab = forwardRef<HTMLButtonElement, TabProps>(
  ({ className = '', value, disabled, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) {
      throw new Error('Tab must be used within Tabs');
    }

    const isActive = context.value === value;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        aria-controls={`panel-${value}`}
        id={`tab-${value}`}
        disabled={disabled}
        onClick={() => !disabled && context.onChange(value)}
        className={`
          flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all
          focus:outline-none focus:ring-2 focus:ring-pharma-500 focus:ring-offset-2
          ${isActive
            ? 'bg-white text-pharma-600 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Tab.displayName = 'Tab';

export const TabPanel = forwardRef<HTMLDivElement, TabPanelProps>(
  ({ className = '', value, children, ...props }, ref) => {
    const context = React.useContext(TabsContext);
    if (!context) {
      throw new Error('TabPanel must be used within Tabs');
    }

    const isActive = context.value === value;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`panel-${value}`}
        aria-labelledby={`tab-${value}`}
        className={`animate-fade-in ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabPanel.displayName = 'TabPanel';
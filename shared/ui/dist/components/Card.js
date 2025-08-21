"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Card = Card;
exports.CardHeader = CardHeader;
exports.CardTitle = CardTitle;
exports.CardDescription = CardDescription;
exports.CardContent = CardContent;
exports.CardFooter = CardFooter;
const jsx_runtime_1 = require("react/jsx-runtime");
const class_variance_authority_1 = require("class-variance-authority");
const cardVariants = (0, class_variance_authority_1.cva)('rounded-lg border bg-white', {
    variants: {
        variant: {
            default: 'border-gray-200 shadow-sm',
            elevated: 'border-gray-200 shadow-md hover:shadow-lg transition-shadow',
            outlined: 'border-gray-300',
            ghost: 'border-transparent'
        },
        padding: {
            none: '',
            sm: 'p-3',
            md: 'p-4',
            lg: 'p-6',
            xl: 'p-8'
        }
    },
    defaultVariants: {
        variant: 'default',
        padding: 'md'
    }
});
// React 19 pattern: ref as a regular prop
function Card({ className = '', variant, padding, header, footer, hoverable = false, children, ...props }) {
    const ref = props.ref;
    const divProps = { ...props };
    delete divProps.ref;
    return ((0, jsx_runtime_1.jsxs)("div", { ref: ref, className: `
        ${cardVariants({ variant, padding: header || footer ? 'none' : padding })}
        ${hoverable ? 'hover:border-gray-300 transition-colors cursor-pointer' : ''}
        ${className}
      `, ...divProps, children: [header && ((0, jsx_runtime_1.jsx)("div", { className: "border-b border-gray-200 px-4 py-3", children: header })), (0, jsx_runtime_1.jsx)("div", { className: header || footer ? cardVariants({ padding, variant: 'ghost' }) : '', children: children }), footer && ((0, jsx_runtime_1.jsx)("div", { className: "border-t border-gray-200 px-4 py-3", children: footer }))] }));
}
Card.displayName = 'Card';
// Card Header component for consistency
function CardHeader({ title, subtitle, action, className = '' }) {
    return ((0, jsx_runtime_1.jsxs)("div", { className: `flex items-center justify-between ${className}`, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold text-gray-900", children: title }), subtitle && ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500 mt-1", children: subtitle }))] }), action && (0, jsx_runtime_1.jsx)("div", { children: action })] }));
}
// Additional Card components for shadcn/ui compatibility
function CardTitle({ children, className = '' }) {
    return ((0, jsx_runtime_1.jsx)("h3", { className: `text-2xl font-semibold leading-none tracking-tight ${className}`, children: children }));
}
function CardDescription({ children, className = '' }) {
    return ((0, jsx_runtime_1.jsx)("p", { className: `text-sm text-muted-foreground ${className}`, children: children }));
}
function CardContent({ children, className = '' }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: `p-6 pt-0 ${className}`, children: children }));
}
function CardFooter({ children, className = '' }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: `flex items-center p-6 pt-0 ${className}`, children: children }));
}

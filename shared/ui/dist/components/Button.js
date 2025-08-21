"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ButtonWithRef = void 0;
exports.Button = Button;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const class_variance_authority_1 = require("class-variance-authority");
const buttonVariants = (0, class_variance_authority_1.cva)('inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', {
    variants: {
        variant: {
            primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
            secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400',
            success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
            warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:ring-yellow-500',
            ghost: 'hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
            link: 'text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-600'
        },
        size: {
            sm: 'h-8 px-3 text-sm',
            md: 'h-10 px-4 text-base',
            lg: 'h-12 px-6 text-lg',
            xl: 'h-14 px-8 text-xl'
        },
        fullWidth: {
            true: 'w-full',
            false: ''
        }
    },
    defaultVariants: {
        variant: 'primary',
        size: 'md',
        fullWidth: false
    }
});
// React 19 pattern: ref as a regular prop
function Button({ className = '', variant, size, fullWidth, isLoading = false, leftIcon, rightIcon, children, disabled, ...props }) {
    const ref = props.ref;
    const buttonProps = { ...props };
    delete buttonProps.ref; // Remove ref from spreading
    return ((0, jsx_runtime_1.jsx)("button", { ref: ref, className: `${buttonVariants({ variant, size, fullWidth })} ${className}`, disabled: disabled || isLoading, ...buttonProps, children: isLoading ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("svg", { className: "mr-2 h-4 w-4 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Loading..."] })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [leftIcon && (0, jsx_runtime_1.jsx)("span", { className: "mr-2", children: leftIcon }), children, rightIcon && (0, jsx_runtime_1.jsx)("span", { className: "ml-2", children: rightIcon })] })) }));
}
Button.displayName = 'Button';
// For backward compatibility
exports.ButtonWithRef = React.forwardRef((props, ref) => (0, jsx_runtime_1.jsx)(Button, { ...props, ref: ref }));
exports.ButtonWithRef.displayName = 'ButtonWithRef';

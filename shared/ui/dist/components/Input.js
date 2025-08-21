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
exports.InputWithRef = void 0;
exports.Input = Input;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const class_variance_authority_1 = require("class-variance-authority");
const inputVariants = (0, class_variance_authority_1.cva)('flex w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', {
    variants: {
        variant: {
            default: 'border-gray-300 focus-visible:ring-blue-600',
            error: 'border-red-500 focus-visible:ring-red-600',
            success: 'border-green-500 focus-visible:ring-green-600',
            warning: 'border-yellow-500 focus-visible:ring-yellow-600'
        },
        inputSize: {
            sm: 'h-8 text-xs',
            md: 'h-10 text-sm',
            lg: 'h-12 text-base',
            xl: 'h-14 text-lg'
        }
    },
    defaultVariants: {
        variant: 'default',
        inputSize: 'md'
    }
});
// React 19 pattern: ref as a regular prop
function Input({ className = '', variant, inputSize, label, error, helperText, leftIcon, rightIcon, id, ...props }) {
    const ref = props.ref;
    const inputProps = { ...props };
    delete inputProps.ref; // Remove ref from spreading to input
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorVariant = error ? 'error' : variant;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "w-full", children: [label && ((0, jsx_runtime_1.jsx)("label", { htmlFor: inputId, className: "block text-sm font-medium text-gray-700 mb-1", children: label })), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [leftIcon && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: leftIcon })), (0, jsx_runtime_1.jsx)("input", { ref: ref, id: inputId, className: `
            ${inputVariants({ variant: errorVariant, inputSize })} 
            ${leftIcon ? 'pl-10' : ''} 
            ${rightIcon ? 'pr-10' : ''} 
            ${className}
          `, "aria-invalid": !!error, "aria-describedby": error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined, ...inputProps }), rightIcon && ((0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none", children: rightIcon }))] }), error && ((0, jsx_runtime_1.jsx)("p", { id: `${inputId}-error`, className: "mt-1 text-sm text-red-600", children: error })), helperText && !error && ((0, jsx_runtime_1.jsx)("p", { id: `${inputId}-helper`, className: "mt-1 text-sm text-gray-500", children: helperText }))] }));
}
Input.displayName = 'Input';
// For backward compatibility, also export with forwardRef 
exports.InputWithRef = React.forwardRef((props, ref) => (0, jsx_runtime_1.jsx)(Input, { ...props, ref: ref }));
exports.InputWithRef.displayName = 'InputWithRef';

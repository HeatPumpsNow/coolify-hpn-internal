"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingSpinner = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
};
const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white'
};
const LoadingSpinner = ({ size = 'md', color = 'primary', fullScreen = false, message }) => {
    const spinner = ((0, jsx_runtime_1.jsxs)("div", { className: `inline-flex flex-col items-center justify-center ${fullScreen ? '' : 'p-4'}`, children: [(0, jsx_runtime_1.jsxs)("svg", { className: `animate-spin ${sizeClasses[size]} ${colorClasses[color]}`, xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), message && ((0, jsx_runtime_1.jsx)("p", { className: `mt-2 text-sm ${colorClasses[color]}`, children: message }))] }));
    if (fullScreen) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: spinner }));
    }
    return spinner;
};
exports.LoadingSpinner = LoadingSpinner;

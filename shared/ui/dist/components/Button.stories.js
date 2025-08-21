"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Large = exports.Small = exports.Disabled = exports.Loading = exports.Ghost = exports.Danger = exports.Secondary = exports.Primary = void 0;
const Button_1 = require("./Button");
const meta = {
    title: 'UI/Button',
    component: Button_1.Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'danger', 'ghost'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
        },
        isLoading: {
            control: 'boolean',
        },
        disabled: {
            control: 'boolean',
        },
    },
};
exports.default = meta;
exports.Primary = {
    args: {
        children: 'Primary Button',
        variant: 'primary',
    },
};
exports.Secondary = {
    args: {
        children: 'Secondary Button',
        variant: 'secondary',
    },
};
exports.Danger = {
    args: {
        children: 'Delete',
        variant: 'danger',
    },
};
exports.Ghost = {
    args: {
        children: 'Ghost Button',
        variant: 'ghost',
    },
};
exports.Loading = {
    args: {
        children: 'Saving...',
        isLoading: true,
    },
};
exports.Disabled = {
    args: {
        children: 'Disabled',
        disabled: true,
    },
};
exports.Small = {
    args: {
        children: 'Small Button',
        size: 'sm',
    },
};
exports.Large = {
    args: {
        children: 'Large Button',
        size: 'lg',
    },
};

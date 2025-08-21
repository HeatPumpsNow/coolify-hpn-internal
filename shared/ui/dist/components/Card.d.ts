import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
declare const cardVariants: (props?: ({
    variant?: "default" | "ghost" | "elevated" | "outlined" | null | undefined;
    padding?: "sm" | "md" | "lg" | "xl" | "none" | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
export interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {
    header?: React.ReactNode;
    footer?: React.ReactNode;
    hoverable?: boolean;
}
export declare function Card({ className, variant, padding, header, footer, hoverable, children, ...props }: CardProps & {
    ref?: React.Ref<HTMLDivElement>;
}): import("react/jsx-runtime").JSX.Element;
export declare namespace Card {
    var displayName: string;
}
export declare function CardHeader({ title, subtitle, action, className }: {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardTitle({ children, className }: {
    children: React.ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardDescription({ children, className }: {
    children: React.ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardContent({ children, className }: {
    children: React.ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function CardFooter({ children, className }: {
    children: React.ReactNode;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Card.d.ts.map
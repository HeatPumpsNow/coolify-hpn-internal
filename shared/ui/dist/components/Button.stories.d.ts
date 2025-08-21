import type { StoryObj } from '@storybook/react';
import { Button } from './Button';
declare const meta: {
    title: string;
    component: typeof Button;
    parameters: {
        layout: string;
    };
    tags: string[];
    argTypes: {
        variant: {
            control: "select";
            options: string[];
        };
        size: {
            control: "select";
            options: string[];
        };
        isLoading: {
            control: "boolean";
        };
        disabled: {
            control: "boolean";
        };
    };
};
export default meta;
type Story = StoryObj<typeof meta>;
export declare const Primary: Story;
export declare const Secondary: Story;
export declare const Danger: Story;
export declare const Ghost: Story;
export declare const Loading: Story;
export declare const Disabled: Story;
export declare const Small: Story;
export declare const Large: Story;
//# sourceMappingURL=Button.stories.d.ts.map
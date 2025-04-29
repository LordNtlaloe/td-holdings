import { cn } from '@/lib/utils';

type AppLogoIconProps = {
    className?: string;
    width?: number;
    height?: number;
};

export default function AppLogoIcon({ className, width = 100, height = 100 }: AppLogoIconProps) {
    return (
        <img
            src="/images/TD-Logo.png"
            alt="App Logo"
            width={width}
            height={height}
            className={cn('object-contain rounded-lg', className)}
        />
    );
}

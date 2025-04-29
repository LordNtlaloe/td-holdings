import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <>
            <div className="bg-slate-800 text-sidebar-primary-foreground flex aspect-square size-15 items-center justify-center rounded-lg">
                <AppLogoIcon className="size-15 dark:text-black bg-slate-800 rounded-md"/>
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">TD Holdings Inventory Dashboard</span>
            </div>
        </>
    );
}

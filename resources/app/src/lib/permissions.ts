const hasPermission = (permissions: string[], action: string): boolean => {
    if (permissions.includes('*')) {
        return true;
    }

    if (action.endsWith('.*')) {
        const prefix = action.slice(0, -1);

        return permissions.some((permission) => permission.startsWith(prefix));
    }

    return permissions.includes(action);
};

const hasAnyPermission = (permissions: string[], actions: string | string[] | null): boolean => {
    if (actions === null) {
        return true;
    }

    return (Array.isArray(actions) ? actions : [actions]).some((action) => hasPermission(permissions, action));
};

export { hasAnyPermission, hasPermission };

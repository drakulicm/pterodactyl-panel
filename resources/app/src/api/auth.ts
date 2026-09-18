import { http } from '@/lib/http';

interface LoginResponse {
    complete: boolean;
    intended?: string;
    confirmationToken?: string;
}

const login = async (data: {
    username: string;
    password: string;
    recaptchaData?: string | null;
}): Promise<LoginResponse> => {
    await http.get('/sanctum/csrf-cookie');

    const response = await http.post('/auth/login', {
        user: data.username,
        password: data.password,
        'g-recaptcha-response': data.recaptchaData,
    });

    if (!(response.data instanceof Object)) {
        throw new Error('An error occurred while processing the login request.');
    }

    return {
        complete: response.data.data.complete,
        intended: response.data.data.intended || undefined,
        confirmationToken: response.data.data.confirmation_token || undefined,
    };
};

const loginCheckpoint = async (data: {
    confirmationToken: string;
    code: string;
    recoveryToken?: string;
}): Promise<LoginResponse> => {
    const response = await http.post('/auth/login/checkpoint', {
        confirmation_token: data.confirmationToken,
        authentication_code: data.code,
        recovery_token: data.recoveryToken?.length ? data.recoveryToken : undefined,
    });

    return {
        complete: response.data.data.complete,
        intended: response.data.data.intended || undefined,
    };
};

const requestPasswordResetEmail = async (data: { email: string; recaptchaData?: string | null }): Promise<string> => {
    const response = await http.post('/auth/password', {
        email: data.email,
        'g-recaptcha-response': data.recaptchaData,
    });

    return response.data.status || '';
};

const performPasswordReset = async (data: {
    email: string;
    token: string;
    password: string;
    passwordConfirmation: string;
}): Promise<{ redirectTo?: string | null; sendToLogin: boolean }> => {
    const response = await http.post('/auth/password/reset', {
        email: data.email,
        token: data.token,
        password: data.password,
        password_confirmation: data.passwordConfirmation,
    });

    return {
        redirectTo: response.data.redirect_to,
        sendToLogin: response.data.send_to_login,
    };
};

export { login, loginCheckpoint, performPasswordReset, requestPasswordResetEmail };
export type { LoginResponse };

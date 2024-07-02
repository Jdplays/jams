from typing import Any
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import InputRequired, EqualTo
from flask_security.forms import LoginForm, RegisterForm

class CustomLoginForm(LoginForm):
    username = StringField('Username or Email', [InputRequired()])
    password = PasswordField('password', [InputRequired()])
    submit = SubmitField('Login')

    def validate(self, **kwargs: Any) -> bool:
        from flask_security.utils import (
            _datastore,
            get_message,
            hash_password
        )
        from flask_security.confirmable import requires_confirmation

        if not super(LoginForm, self).validate():
            return False
        
        self.user = _datastore.find_user(email=self.username.data)

        if self.user is None:
            self.user = _datastore.find_user(username=self.username.data)

        if self.user is None:
            self.username.errors.append(get_message('USER_DOES_NOT_EXIST')[0])
            return False
        
        if not self.user.password:
            self.password.errors.append(get_message("PASSWORD_NOT_SET")[0])
            # Reduce timing variation between existing and non-existing users
            hash_password(self.password.data)
            return False
        if not self.user.verify_and_update_password(self.password.data):
            self.password.errors.append(get_message("INVALID_PASSWORD")[0])
            return False
        if requires_confirmation(self.user):
            self.email.errors.append(get_message("CONFIRMATION_REQUIRED")[0])
            return False
        if not self.user.is_active:
            self.email.errors.append(get_message("DISABLED_ACCOUNT")[0])
            return False
        return True

class CustomRegisterForm(RegisterForm):
    email = StringField('Email', [InputRequired()])
    username = StringField('Username', [InputRequired()])
    first_name = StringField('First Name', [InputRequired()])
    last_name = StringField('Last Name', [InputRequired()])
    password = PasswordField('password', [InputRequired()])
    password_confirm = PasswordField('Confirm Password', [
        InputRequired(),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Register')

    def validate(self, **kwargs: Any) -> bool:
        from flask_security.utils import (
            _datastore,
            get_message,
        )

        if not super().validate():
            return False
        
        # Check if email is already registered
        user = _datastore.find_user(email=self.email.data)
        if user:
            self.email.errors.append(get_message('EMAIL_ALREADY_ASSOCIATED')[0])
            return False
        
        # Check if username is already taken
        user = _datastore.find_user(username=self.username.data)
        if user:
            self.username.errors.append(get_message('USERNAME_ALREADY_ASSOCIATED')[0])
            return False
        return True
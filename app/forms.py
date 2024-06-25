from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import InputRequired
from flask_security.forms import LoginForm, RegisterForm

class CustomLoginForm(LoginForm):
    email = StringField('Email', [InputRequired()])
    password = PasswordField('password', [InputRequired()])
    submit = SubmitField('Login')

class CustomRegisterForm(RegisterForm):
    email = StringField('Email', [InputRequired()])
    password = PasswordField('password', [InputRequired()])
    submit = SubmitField('Register')
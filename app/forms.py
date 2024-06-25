from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import InputRequired
from flask_security.forms import LoginForm, RegisterForm

class CustomLoginForm(LoginForm):
    username = StringField('Username', [InputRequired()])
    email = None # Remove the field
    password = PasswordField('password', [InputRequired()])
    submit = SubmitField('Login')

class CustomRegisterForm(RegisterForm):
    #email = StringField('Email', [InputRequired()])
    username = StringField('Username', [InputRequired()])
    email = None # Remove the field
    password = PasswordField('password', [InputRequired()])
    submit = SubmitField('Register')
---
title: "Web Application Development in Django and Docker with Cookiecutter Django"
seoTitle: "Django and Docker with Cookiecutter Django: A Guide"
description: "Build a Django app in Docker with Cookiecutter Django: the options to pick, daily Compose commands, adding apps and packages, and deploying."
pubDate: 2025-04-01
updatedDate: 2026-10-04
pillar: build
tags: ["Django","Docker","Cookiecutter Django","Web Development"]
legacyUrl: "/insights/web-application-development-in-django-and-docker/"
gsc12mo: "3 clicks / 2,556 impr / pos 12.3"
---

The quickest way to start a production-ready Django app in Docker is [Cookiecutter Django](https://github.com/cookiecutter/cookiecutter-django). Generate a project with `cookiecutter gh:cookiecutter/cookiecutter-django`, build it with `docker compose -f docker-compose.local.yml build`, start it with `up`, and run every Django command through `docker compose ... run --rm django`. The template comes with users and authentication, Postgres, email, static files, tests and a production setup already wired together, so you spend your time on the app itself.

This is the setup I use for client apps. It isn't simple, because web apps aren't simple, but it's a repeatable path from an empty folder to a deployed project. Below: what to learn first, the options I pick, the commands I use every day, how to add apps and packages, and how it gets to production.

## What to learn first

If you're new to some of this, put these in place first. Each takes an afternoon or less.

- **Python.** Install a current version from [python.org](https://www.python.org/). Programming with Mosh has a [one-hour Python introduction](https://www.youtube.com/watch?v=kqtD5dpn9C8) that covers enough to start.
- **Django.** Do one beginner tutorial before you use the template, so you know what models, views, templates and `manage.py` are. Mosh's [one-hour Django tutorial](https://www.youtube.com/watch?v=rHux0gMZ3Eg) works, as does the official tutorial. Then skim the [Django docs](https://docs.djangoproject.com/). You won't remember it all, but you'll know where to look later.
- **Docker.** Docker runs each part of your app (Python and Django, Postgres, the mail catcher) in its own container, so the setup is identical on every machine and on the server. Install [Docker](https://docs.docker.com/get-started/get-docker/); it includes **Docker Compose**, which reads a YAML file describing all the containers and starts them together. You won't need to write Compose files, only run them.

### What Cookiecutter Django is

[Cookiecutter](https://www.cookiecutter.io/) is a tool that generates a project from a template by asking you a few questions. Cookiecutter Django is the best-known Django template, started by Daniel Roy Greenfeld and maintained by a large group of contributors. It gives you a project laid out the way an experienced team would set it up, with the production pieces already in place.

I came to Django from design, Photoshop and HTML, and the template took me a while to understand. I drew [this diagram in Whimsical](https://whimsical.com/khaotic-digital-WYbxMVU1btw1npM6rsWHGw@3CRerdhrAw9CvyHLu7mL8Aj8) to map how the pieces fit, and it may help you too. Read the template's [README](https://github.com/cookiecutter/cookiecutter-django#readme) and [docs](https://cookiecutter-django.readthedocs.io/) before you start. It's an hour well spent.

## Step 1: Generate the project

Install Cookiecutter, then point it at the template. I install command-line Python tools with [uv](https://docs.astral.sh/uv/), which keeps each one in its own environment. A plain `pip install` fails on current Ubuntu and Debian, which block installing packages into the system Python.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh    # one time; see uv's docs for Windows and macOS
uv tool install cookiecutter
cookiecutter gh:cookiecutter/cookiecutter-django
```

Have Docker installed and running before this step. When you answer `y` to `use_docker`, the template builds a small Docker image while it generates the project, to lock the Python dependencies.

It asks a series of questions. These are my usual answers and why:

| Option | My choice | Why |
| --- | --- | --- |
| `domain_name` | Your real domain | It goes into the production Traefik config and the Django Sites setup. Getting it right now saves edits at deploy time. |
| `open_source_license` | MIT, or "Not open source" for client work | |
| `username_type` | email | Users log in with an email address. "username" is faster for testing. |
| `timezone` | UTC | Store times in UTC and convert for display. |
| `editor` | VS Code | Adds editor settings; it doesn't change how the app works. |
| `use_docker` | y | The rest of this guide assumes Docker. |
| `postgresql_version` | The newest offered | It runs in its own container, so there's nothing to install. |
| `cloud_provider` | AWS, or None | Where uploaded media is stored in production. None keeps files on the server. |
| `mail_service` | The provider you already use | I've mostly used SendGrid. Create the account, verify your domain, and paste the API key into the production env file. |
| `rest_api` | None to start | DRF and Django Ninja are both good when you need an API. Add one when you do. |
| `use_async` | n, unless you need it | Runs Django under ASGI with Uvicorn, for websockets or async views. Both modes reload automatically when you change code. |
| `frontend_pipeline` | None | Webpack and Gulp add a JavaScript build step. Start without one unless you know you need it. |
| `use_celery` | n to start | Celery runs background and scheduled jobs (sending emails, expiring subscriptions). Worth learning; [Real Python's tutorial](https://realpython.com/asynchronous-tasks-with-django-and-celery/) is a good start. |
| `mail_catcher` | Mailpit | Catches every email your local app sends and shows it at `http://localhost:8025`. |
| `use_sentry` | y | Sentry shows the full error details from production, which otherwise just shows a 500 page. There's a free tier. |
| `use_whitenoise` | y | Serves static files in production with no extra setup. |
| `use_heroku` | n | I deploy to a DigitalOcean droplet instead. |
| `ci_tool` | Github | Runs tests and linting on every push with GitHub Actions. |
| `keep_local_envs_in_vcs` | y for a team, n if unsure | Only the local development settings are affected. Production secrets are never committed. |
| `debug` | n | This one is for people working on the template itself, not for your app. |

## Step 2: Set up Git and pre-commit

The template comes with [pre-commit](https://pre-commit.com/) checks that format your code and catch problems like unused imports every time you commit. The checks run on your machine, not in Docker, and the template pins them to Python 3.14. Install both with uv, then set up the repository:

```bash
uv python install 3.14
uv tool install pre-commit
cd your_project
git init
pre-commit install
```

Now a commit runs the checks first. If any fail, they either fix the files themselves or tell you exactly what to change. Fix it, `git add` again and commit again. After a long session across many files, it sometimes takes me three or four rounds. Nearly every remaining error is a one-line fix, so it's quicker to fix them all at once than to keep re-running.

If your first commit fails with `failed to find interpreter for ... python3.14`, the checks can't find Python 3.14; run `uv python install 3.14` and commit again. Don't skip the checks for long: my deploys go through the Git repository, and the checks keep what gets pushed clean.

## Step 3: Build and start the stack

```bash
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml run --rm django uv lock
docker compose -f docker-compose.local.yml build
docker compose -f docker-compose.local.yml up
```

The first build takes a while. The template manages Python packages with [uv](https://docs.astral.sh/uv/), and the `uv lock` step creates the lockfile inside the container, which is why the image gets built twice the first time.

When the logs settle, the app is at `http://localhost:8000` (or `:3000` if you picked a frontend pipeline).

Typing `-f docker-compose.local.yml` every time gets old. Set it once per terminal session:

```bash
export COMPOSE_FILE=docker-compose.local.yml
```

and the rest of the commands shorten to `docker compose up`, `docker compose run --rm django ...` and so on. The template also includes a `justfile`: if you install [just](https://github.com/casey/just), `just up`, `just logs` and `just manage migrate` do the same jobs.

## The commands you'll use every day

**Start and stop.** `up` runs in the foreground and streams the logs. Stop it with Ctrl+C. (That's also "copy" in many terminals, so copying an error out of the logs can stop your server. Use the right-click menu instead.)

```bash
docker compose up            # foreground, live logs
docker compose up -d         # background (detached)
docker compose logs -f       # follow logs while detached
docker compose down          # stop everything
docker compose up --build    # rebuild after changing dependencies or Dockerfiles
```

**Run Django commands.** Every `manage.py` command runs inside the `django` container. `run --rm` starts a fresh container for the command and removes it when it finishes:

```bash
docker compose run --rm django python manage.py migrate
docker compose run --rm django python manage.py createsuperuser
docker compose run --rm django python manage.py makemigrations
docker compose run --rm django python manage.py shell
```

The local container runs `migrate` itself each time it starts, so you mostly run it by hand after `makemigrations`. Create a superuser, open `http://localhost:8000/admin/` and log in. If the admin loads, the database and the app are talking.

Code changes reload automatically. You'll occasionally need to restart (`docker compose restart django`) after changes the reloader doesn't catch, such as new template tags or signal handlers.

## Adding Python packages

Don't `pip install` or `uv add` inside a running container. Containers are disposable, so the package disappears the next time one starts. Instead, add it to `pyproject.toml` under `dependencies` (or the `dev` group for development-only tools), then rebuild:

```bash
docker compose build
docker compose up
```

That way the package is part of the image, and production gets exactly the same versions.

## Adding a Django app

Create the app with `startapp`, then move it into the project's inner package (the folder named after your project), where the template keeps its apps:

```bash
docker compose run --rm --user "$(id -u):$(id -g)" django python manage.py startapp listings
mv listings your_project/
```

The `--user` part matters on Linux. The development container runs as root, so without it the new files belong to root, `mv` fails with "Permission denied", and you can't edit them without `sudo`. Docker Desktop on macOS and Windows maps file ownership for you, so there the flag is harmless. Use it for `makemigrations` too, for the same reason.

Then make two edits. In `your_project/listings/apps.py`, include the project name in the app's `name`:

```python
class ListingsConfig(AppConfig):
    name = "your_project.listings"
```

And in `config/settings/base.py`, add it to `LOCAL_APPS`:

```python
LOCAL_APPS = [
    "your_project.users",
    "your_project.listings",
]
```

## How I build features: CRUDL with class-based views

Most features come down to the same operations on a model: **C**reate, **R**etrieve, **U**pdate, **D**elete. I add an unofficial **L** for List, which is technically a batch retrieve, hence CRUDL.

A **model** is a Python class that maps to a database table. A comment form, a user profile, a listing: each needs at least one. To let users create and edit records, pair the model with a `ModelForm`, then use Django's **generic class-based views** for each operation: `CreateView`, `DetailView`, `UpdateView`, `DeleteView` and `ListView`.

Most beginner tutorials teach function-based views. Class-based views can look harder, but for this kind of work they're more like training wheels: the GET and POST handling is built in, and you set a few attributes.

Here's a small but complete example: listings that any logged-in user can create, and only their owner can edit. Start with the model in `your_project/listings/models.py`:

```python
from django.conf import settings
from django.db import models


class Listing(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="listings",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created"]

    def __str__(self):
        return self.title
```

The form, in a new `forms.py` next to it. It leaves out `owner` on purpose:

```python
from django import forms

from .models import Listing


class ListingForm(forms.ModelForm):
    class Meta:
        model = Listing
        # No "owner": the view sets it, so users can't assign listings to someone else.
        fields = ["title", "description", "price"]
```

The views, in `views.py`:

```python
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.mixins import UserPassesTestMixin
from django.urls import reverse_lazy
from django.views.generic import CreateView
from django.views.generic import ListView
from django.views.generic import UpdateView

from .forms import ListingForm
from .models import Listing


class ListingListView(ListView):
    model = Listing
    template_name = "listings/listing_list.html"


class ListingCreateView(LoginRequiredMixin, CreateView):
    model = Listing
    form_class = ListingForm
    template_name = "listings/listing_form.html"
    success_url = reverse_lazy("listings:list")

    def form_valid(self, form):
        form.instance.owner = self.request.user  # set the foreign key before saving
        return super().form_valid(form)


class ListingUpdateView(LoginRequiredMixin, UserPassesTestMixin, UpdateView):
    model = Listing
    form_class = ListingForm
    template_name = "listings/listing_form.html"
    success_url = reverse_lazy("listings:list")

    def test_func(self):
        return self.get_object().owner == self.request.user  # only the owner can edit
```

Give the app its own URLs in a new `urls.py`. The `app_name` is what makes names like `listings:list` work:

```python
from django.urls import path

from . import views

app_name = "listings"
urlpatterns = [
    path("", views.ListingListView.as_view(), name="list"),
    path("new/", views.ListingCreateView.as_view(), name="create"),
    path("<int:pk>/edit/", views.ListingUpdateView.as_view(), name="update"),
]
```

and include them in `config/urls.py`, next to the existing `users/` line:

```python
    path("listings/", include("your_project.listings.urls")),
```

Each view needs a template. They go in `your_project/templates/listings/`. `listing_form.html` serves both create and edit:

```html
{% extends "base.html" %}

{% block content %}
  <h1>{% if object %}Edit listing{% else %}New listing{% endif %}</h1>
  <form method="post">
    {% csrf_token %}
    {{ form.as_div }}
    <button type="submit" class="btn btn-primary">Save</button>
  </form>
{% endblock content %}
```

and `listing_list.html`:

```html
{% extends "base.html" %}

{% block content %}
  <h1>Listings</h1>
  <a href="{% url 'listings:create' %}" class="btn btn-primary">New listing</a>
  <ul>
    {% for listing in object_list %}
      <li>
        {{ listing.title }} ({{ listing.price }})
        {% if listing.owner == request.user %}<a href="{% url 'listings:update' listing.pk %}">Edit</a>{% endif %}
      </li>
    {% empty %}
      <li>No listings yet.</li>
    {% endfor %}
  </ul>
{% endblock content %}
```

Finally, create and apply the migration for the new model:

```bash
docker compose run --rm --user "$(id -u):$(id -g)" django python manage.py makemigrations listings
docker compose run --rm django python manage.py migrate
```

Open `http://localhost:8000/listings/`, log in, and add a listing. Log in as a second user and try its edit URL: you'll get a 403, because `test_func` only lets the owner through.

The methods I override most:

- **`get_context_data`**: add variables to the template, like a page title or a parent object.
- **`get_form`**: adjust the form before it's shown.
- **`form_valid`**: process a valid submission. Foreign keys usually get set here.
- **`get_success_url`**: where to send the user after a successful submit.
- **`test_func`**: with `UserPassesTestMixin`, check ownership or roles before allowing access.

`LoginRequiredMixin` keeps logged-out users out; it's the class-based equivalent of the `@login_required` decorator. Templates live in the project's `templates` folder, and you reference them by their path inside it, as in `template_name` above. The template's base layout uses Bootstrap 5, so [Bootstrap's docs](https://getbootstrap.com/docs/) and examples are a good source of layouts while you learn Django's [template language](https://docs.djangoproject.com/en/stable/topics/templates/).

## Getting to production

When the app is ready, it deploys with `docker-compose.production.yml`. Traefik, which is included, handles HTTPS certificates from Let's Encrypt automatically. I've written the full walkthrough separately: [How to Deploy Cookiecutter Django on a DigitalOcean Droplet](/insights/how-to-deploy-cookiecutter-django-on-a-digitalocean-droplet-ubuntu-2204/). It covers server hardening, the firewall, settings, backups and restarts.

Two things I learned the hard way:

**Traefik and your domain.** If certificates fail, the most common cause is that the domain you entered when generating the project isn't the one you're deploying to. It's written into the Traefik config and the Django Sites data, so search the whole project for the old domain and replace it.

**Migrations only come from your machine.** The release flow is: build and test locally, run `makemigrations` locally, commit, push, then on the server `git pull` and `docker compose -f docker-compose.production.yml up --build -d`, followed by `migrate`. There's no need to take the site down first, so you avoid downtime. Never run `makemigrations` on the server. It creates migration files that exist nowhere else, the next deploy conflicts with them, and untangling that can mean editing the database by hand. I've spent hours on it, and it's an easy way to wreck a database.

The template's [production docs](https://cookiecutter-django.readthedocs.io/en/latest/3-deployment/deployment-with-docker.html) and its options for cloud storage (S3, Google Cloud, Azure) cover the rest when you need it.
